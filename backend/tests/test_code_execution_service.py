import pytest
import asyncio
from backend.models.schemas import TestCase
from backend.services.code_execution_service import CodeExecutionService

service = CodeExecutionService()


def _tc(id: str, input: str, expected_output: str) -> TestCase:
    return TestCase(id=id, input=input, expected_output=expected_output)


# ---------------------------------------------------------------------------
# Python execution
# ---------------------------------------------------------------------------


class TestPythonExecution:
    @pytest.mark.asyncio
    async def test_simple_pass(self):
        code = "x = int(input())\nprint(x * 2)"
        cases = [_tc("t1", "5", "10")]
        result = await service.execute_challenge(code, "python", cases)
        assert result.all_passed is True
        assert len(result.test_case_results) == 1
        assert result.test_case_results[0].passed is True
        assert result.execution_time_ms is not None
        assert result.execution_time_ms > 0

    @pytest.mark.asyncio
    async def test_simple_fail(self):
        code = "print('wrong')"
        cases = [_tc("t1", "", "right")]
        result = await service.execute_challenge(code, "python", cases)
        assert result.all_passed is False
        assert result.test_case_results[0].passed is False
        assert result.test_case_results[0].actual_output == "wrong"
        assert result.test_case_results[0].expected_output == "right"
        assert result.execution_time_ms is None

    @pytest.mark.asyncio
    async def test_multiple_test_cases(self):
        code = "x = int(input())\nprint(x + 1)"
        cases = [
            _tc("t1", "1", "2"),
            _tc("t2", "10", "11"),
            _tc("t3", "0", "1"),
        ]
        result = await service.execute_challenge(code, "python", cases)
        assert result.all_passed is True
        assert len(result.test_case_results) == 3
        for r in result.test_case_results:
            assert r.passed is True

    @pytest.mark.asyncio
    async def test_partial_pass(self):
        code = "x = int(input())\nprint(x + 1)"
        cases = [
            _tc("t1", "1", "2"),
            _tc("t2", "10", "99"),  # will fail
        ]
        result = await service.execute_challenge(code, "python", cases)
        assert result.all_passed is False
        assert result.test_case_results[0].passed is True
        assert result.test_case_results[1].passed is False
        assert result.execution_time_ms is None

    @pytest.mark.asyncio
    async def test_syntax_error(self):
        code = "def foo(\n"  # syntax error
        cases = [_tc("t1", "", "anything")]
        result = await service.execute_challenge(code, "python", cases)
        assert result.all_passed is False
        assert "Error" in result.test_case_results[0].actual_output

    @pytest.mark.asyncio
    async def test_runtime_error(self):
        code = "x = 1 / 0"
        cases = [_tc("t1", "", "anything")]
        result = await service.execute_challenge(code, "python", cases)
        assert result.all_passed is False
        assert "Error" in result.test_case_results[0].actual_output

    @pytest.mark.asyncio
    async def test_multiline_input(self):
        code = "a = int(input())\nb = int(input())\nprint(a + b)"
        cases = [_tc("t1", "3\n4", "7")]
        result = await service.execute_challenge(code, "python", cases)
        assert result.all_passed is True


# ---------------------------------------------------------------------------
# JavaScript execution
# ---------------------------------------------------------------------------


class TestJavaScriptExecution:
    @pytest.mark.asyncio
    async def test_simple_pass(self):
        code = "const x = parseInt(readline());\nconsole.log(x * 2);"
        cases = [_tc("t1", "5", "10")]
        result = await service.execute_challenge(code, "javascript", cases)
        assert result.all_passed is True
        assert result.test_case_results[0].passed is True
        assert result.execution_time_ms is not None

    @pytest.mark.asyncio
    async def test_simple_fail(self):
        code = "console.log('wrong');"
        cases = [_tc("t1", "", "right")]
        result = await service.execute_challenge(code, "javascript", cases)
        assert result.all_passed is False
        assert result.test_case_results[0].actual_output == "wrong"

    @pytest.mark.asyncio
    async def test_syntax_error(self):
        code = "function foo( {"  # syntax error
        cases = [_tc("t1", "", "anything")]
        result = await service.execute_challenge(code, "javascript", cases)
        assert result.all_passed is False
        assert "Error" in result.test_case_results[0].actual_output

    @pytest.mark.asyncio
    async def test_runtime_error(self):
        code = "throw new Error('boom');"
        cases = [_tc("t1", "", "anything")]
        result = await service.execute_challenge(code, "javascript", cases)
        assert result.all_passed is False
        assert "Error" in result.test_case_results[0].actual_output


# ---------------------------------------------------------------------------
# Unsupported language
# ---------------------------------------------------------------------------


class TestUnsupportedLanguage:
    @pytest.mark.asyncio
    async def test_unsupported_language(self):
        result = await service.execute_challenge("code", "ruby", [_tc("t1", "", "")])
        assert result.all_passed is False
        assert result.error is not None
        assert "Unsupported language" in result.error
        assert len(result.test_case_results) == 0


# ---------------------------------------------------------------------------
# Result structure
# ---------------------------------------------------------------------------


class TestResultStructure:
    @pytest.mark.asyncio
    async def test_result_count_matches_test_cases(self):
        code = "print(input())"
        cases = [_tc(f"t{i}", str(i), str(i)) for i in range(5)]
        result = await service.execute_challenge(code, "python", cases)
        assert len(result.test_case_results) == 5

    @pytest.mark.asyncio
    async def test_execution_time_only_on_all_passed(self):
        code = "print(input())"
        # All pass
        result = await service.execute_challenge(
            code, "python", [_tc("t1", "a", "a")]
        )
        assert result.all_passed is True
        assert result.execution_time_ms is not None

        # One fails
        result2 = await service.execute_challenge(
            code, "python", [_tc("t1", "a", "b")]
        )
        assert result2.all_passed is False
        assert result2.execution_time_ms is None
