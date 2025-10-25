export function Footer() {
  return (
    <footer className="w-full border-t mt-auto">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Built with care by</span>
          <a
            href="https://firrj.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors"
          >
            Firas Jaber
          </a>
        </div>
      </div>
    </footer>
  );
}
