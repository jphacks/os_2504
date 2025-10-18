import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import App from './App.js';

describe('App', () => {
  it('renders MogFinder prototype heading', () => {
    const html = renderToString(<App />);
    expect(html).toContain('MogFinder プロトタイプ');
  });
});
