import TopicCatalog from '../components/Catalog/TopicCatalog';

export default function Catalog() {
  return (
    <section aria-label="Topic catalog">
      <h1 className="font-display text-3xl font-bold tracking-tight text-lc-text mb-2">Topic Catalog</h1>
      <p className="text-lc-muted mb-8 max-w-2xl leading-relaxed">Browse learning paths by category. Each path is made of modules with explanations and interactive exercises.</p>
      <TopicCatalog />
    </section>
  );
}
