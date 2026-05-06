//import style css
import '../styles/photos.css';

import React from 'react';

function Album({ title, description, imageUrl }) {
  return (
    <div className="album-card">
      <div className="album-image" style={{ backgroundImage: `url(${imageUrl})` }}>
        <div className="album-placeholder">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
}

export default Album;