import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import App from './app/App';

describe('App', () => {
  it('renders MogFinder prototype heading', () => {
    const html = renderToString(<App />);
    expect(html).toContain('MogFinder プロトタイプ');
  });
});
