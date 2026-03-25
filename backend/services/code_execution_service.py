import asyncio
import os
import tempfile
import time

from backend.models.schemas import ChallengeResult, TestCase, TestCaseResult

SUPPORTED_LANGUAGES = {"python", "javascript"}
EXECUTION_TIMEOUT = 10  # seconds


class CodeExecutionService:
    """Executes user-submitted code against test cases in a sandboxed subprocess."""

    async def execute_challenge(
        self,
        code: str,
        language: str,
        test_cases: list[TestCase],
    ) -> ChallengeResult:
        if language not in SUPPORTED_LANGUAGES:
            return ChallengeResult(
                all_passed=False,
                test_case_results=[],
                error=f"Unsupported language: {language}. Supported: {', '.join(sorted(SUPPORTED_LANGUAGES))}",
            )

        start = time.monotonic()
        results: list[TestCaseResult] = []

        for tc in test_cases:
            result = await self._run_single_test(code, language, tc)
            results.append(result)
            # If there was a syntax/runtime error, it will show in actual_output
            # but we continue running remaining test cases

        elapsed_ms = (time.monotonic() - start) * 1000
        all_passed = all(r.passed for r in results)

        return ChallengeResult(
            all_passed=all_passed,
            test_case_results=results,
            execution_time_ms=round(elapsed_ms, 2) if all_passed else None,
            error=None,
        )

    async def _run_single_test(
        self,
        code: str,
        language: str,
        test_case: TestCase,
    ) -> TestCaseResult:
        wrapper = self._build_wrapper(code, language, test_case.input)
        cmd = self._get_command(language)

        try:
            stdout, stderr = await self._execute_in_subprocess(wrapper, cmd)
        except asyncio.TimeoutError:
            return TestCaseResult(
                test_case_id=test_case.id,
                passed=False,
                expected_output=test_case.expected_output,
                actual_output="Error: Execution timed out (10s limit)",
            )
        except Exception as exc:
            return TestCaseResult(
                test_case_id=test_case.id,
                passed=False,
                expected_output=test_case.expected_output,
                actual_output=f"Error: {exc}",
            )

        if stderr:
            return TestCaseResult(
                test_case_id=test_case.id,
                passed=False,
                expected_output=test_case.expected_output,
                actual_output=f"Error: {stderr.strip()}",
            )

        actual = stdout.strip()
        passed = actual == test_case.expected_output.strip()

        return TestCaseResult(
            test_case_id=test_case.id,
            passed=passed,
            expected_output=test_case.expected_output.strip(),
            actual_output=actual,
        )

    async def _execute_in_subprocess(
        self, code: str, cmd: list[str]
    ) -> tuple[str, str]:
        """Write code to a temp file and execute it with a timeout."""
        suffix = ".py" if "python" in cmd[0] else ".js"
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=suffix, delete=False
        ) as tmp:
            tmp.write(code)
            tmp_path = tmp.name

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                tmp_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(), timeout=EXECUTION_TIMEOUT
            )
            return stdout_bytes.decode(), stderr_bytes.decode()
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    @staticmethod
    def _build_wrapper(code: str, language: str, test_input: str) -> str:
        """Wrap user code so that `test_input` is fed via stdin."""
        if language == "python":
            # Provide input via sys.stdin using io.StringIO
            return (
                "import sys, io\n"
                f"sys.stdin = io.StringIO({test_input!r})\n"
                f"{code}\n"
            )
        else:  # javascript
            # Provide a simple readline that returns lines from the input
            lines_json = repr(test_input.split("\n")).replace("'", '"')
            return (
                f"const __lines = {lines_json};\n"
                "let __lineIdx = 0;\n"
                "const readline = () => __lines[__lineIdx++];\n"
                f"{code}\n"
            )

    @staticmethod
    def _get_command(language: str) -> list[str]:
        if language == "python":
            return ["python3"]
        else:
            return ["node"]
