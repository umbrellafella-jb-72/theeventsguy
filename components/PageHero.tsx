import { PortScene, type Scene } from '@/components/Art';

export function PageHero({ eyebrow, title, intro, scene, children }: { eyebrow: string; title: string; intro: string; scene: Scene; children?: React.ReactNode }) {
  return (
    <section className="page-hero">
      <div className="wrap page-hero-inner">
        <div className="page-hero-text">
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{intro}</p>
          {children}
        </div>
        <PortScene scene={scene} className="page-hero-art" align="xMaxYMax" />
      </div>
    </section>
  );
}
