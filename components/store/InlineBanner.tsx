'use client';

interface Props {
  image_url: string;
  title?: string;
  link_url?: string;
}

export default function InlineBanner({ image_url, title, link_url }: Props) {
  const inner = (
    <div className="relative w-full overflow-hidden rounded-2xl ring-1 ring-gray-100 shadow-sm">
      <img
        src={image_url}
        alt={title || 'Promotion'}
        className="w-full object-cover max-h-48"
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    </div>
  );

  if (link_url) {
    return (
      <a href={link_url} target="_blank" rel="noopener noreferrer" className="block col-span-full">
        {inner}
      </a>
    );
  }
  return <div className="col-span-full">{inner}</div>;
}
