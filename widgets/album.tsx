import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

type AlbumProps = {
  title: string;
  description: string;
  imageFolderURL: string;
};

function Album({ title, description, imageFolderURL }: AlbumProps) {
    const [viewPics, setViewPics] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    const [viewDesc, setViewDesc] = useState(false);

    useEffect(() => {
      const loadImages = async () => {
        const res = await fetch(`/api/images?folder=albums/${imageFolderURL}`);
        const data = await res.json();
        setImages(data);
      };
      loadImages();
    }, [imageFolderURL]);

    useEffect(() => {
      if (viewPics) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    }, [viewPics]);

    return (
        <div>
        {viewPics && (
          <div className="image-overlay">
            <button className="close-button" onClick={() => setViewPics(false)}>
              &times;
            </button>
            <div className="image-scroll">
              {images.map((img) => (
                <img key={img} src={img}/>
              ))}
            </div>
          </div>
        )}
      <div className="album-card" onClick={() => setViewPics(!viewPics)}>
        <img src={images[0]} alt={title} width="300" height="200" />
        <div className="album-content">
          <h2>{title}</h2>
          <div className="hLine"></div>
          <div className="expansiveCont">
            <p className="viewMore" onClick={(e) => {
              e.stopPropagation();
              setViewDesc(!viewDesc);
            }}>
              {viewDesc ? 'View Less ↑' : 'View More ↓'}
            </p>
            <p className={viewDesc ? 'desc' : 'desc hidden'}>{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const rootElements = document.querySelectorAll<HTMLElement>('.album');

rootElements.forEach((rootElement) => {
  const props = {
    title: rootElement.dataset.title || '',
    description: rootElement.dataset.description || '',
    imageFolderURL: rootElement.dataset.folder || '',
  };

  ReactDOM.createRoot(rootElement).render(
    <Album {...props} />
  );
});