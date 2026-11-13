import type { BuilderDocument } from "@/lib/schemas/builder";
import { CardRenderer } from "./CardRenderer";
import { SafeImage } from "./SafeImage";
import { themeVariables } from "@/lib/page-presentation";

export function PagePreview({ document, fullPage = false, showHidden = false }: { document: BuilderDocument; fullPage?: boolean; showHidden?: boolean }) {
  const { page, cards, theme } = document;
  return <div className={`public-page ${fullPage ? "public-page-full" : ""}`} style={themeVariables(theme)}>
    {theme.backgroundStyle === "image" && theme.backgroundImage && <div className="public-backdrop" aria-hidden="true"><SafeImage src={theme.backgroundImage} alt="" sizes="100vw" priority className="object-cover" /></div>}
    <div className="public-content">
      <header className="public-header">
        {page.coverImage && <div className="public-cover"><SafeImage src={page.coverImage} alt={`Sampul ${page.title}`} sizes={`(max-width: ${theme.contentWidth}px) calc(100vw - 32px), ${theme.contentWidth}px`} priority className="object-cover" /></div>}
        {page.logo && <div className="public-logo"><SafeImage src={page.logo} alt={`Logo ${page.title}`} sizes="80px" priority={!page.coverImage} className="object-cover" /></div>}
        <h1>{page.title}</h1>{page.description && <p>{page.description}</p>}
      </header>
      <div className="public-cards">{cards.map(({ id, data }, index) => <div key={id} className="public-card-entry">
        {showHidden && !data.isVisible && <p className="public-hidden-label">Kartu tersembunyi · hanya terlihat dalam pratinjau admin</p>}
        <CardRenderer card={data} theme={theme} showHidden={showHidden} priority={fullPage && index === 0 && !page.coverImage} />
      </div>)}</div>
      {theme.showFooter && <footer className="public-footer">Dibuat dengan <a href="/" rel="noopener noreferrer">QR Card Page</a></footer>}
    </div>
  </div>;
}
