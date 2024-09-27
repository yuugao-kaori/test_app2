import React from 'react';
import ReactDOM from 'react-dom';
import './index.css'; // TailwindCSSをインポート
import App from './App';

ReactDOM.createRoot(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
