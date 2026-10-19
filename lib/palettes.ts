// Card / cover palettes. Only rendered images and the 公众号 layout use these; the app UI stays neutral.
export type Palette = {
  id: string;
  name: string;
  fit: string;
  bg: string; bg2: string; a1: string; a2: string;
  text: string; body: string; muted: string; line: string; hair: string;
  mp: string; // accent for 公众号 body text (white page, no gradients)
};

export const PALETTES: Palette[] = [
  { id: 'aurora', name: '极光蓝紫', fit: '科技、AI、数码', bg: '#05060C', bg2: '#0B0E1C', a1: '#4C8DFF', a2: '#B06BFF', text: '#F3F5FF', body: '#C5CAE0', muted: '#8A91AE', line: 'rgba(120,140,255,.10)', hair: 'rgba(255,255,255,.10)', mp: '#5B5BF0' },
  { id: 'green', name: '终端绿', fit: '编程、开发者、极客', bg: '#060807', bg2: '#0C1210', a1: '#3BFFA0', a2: '#3BFFA0', text: '#F1F5F3', body: '#C4D1CB', muted: '#7D8C85', line: 'rgba(59,255,160,.10)', hair: 'rgba(255,255,255,.10)', mp: '#0E8A5A' },
  { id: 'signal', name: '信号红', fit: '热点快评、财经新闻', bg: '#0A0A0B', bg2: '#141416', a1: '#FF4A2B', a2: '#FF4A2B', text: '#F5F5F5', body: '#CFCFD4', muted: '#8E8E93', line: 'rgba(255,255,255,.06)', hair: 'rgba(255,255,255,.10)', mp: '#C93A1E' },
  { id: 'orange', name: '暖阳橙', fit: '生活方式、美食、亲子', bg: '#FFF7EF', bg2: '#FFFFFF', a1: '#FF8A3D', a2: '#FF5E62', text: '#2A1A12', body: '#4A3A30', muted: '#8A6F60', line: 'rgba(0,0,0,.06)', hair: 'rgba(0,0,0,.10)', mp: '#D45A1F' },
  { id: 'ink', name: '墨青', fit: '读书、教育、传统文化', bg: '#F3F0E8', bg2: '#FFFFFF', a1: '#1F6F6B', a2: '#1F6F6B', text: '#1B2422', body: '#3A4542', muted: '#6B7672', line: 'rgba(0,0,0,.06)', hair: 'rgba(0,0,0,.10)', mp: '#1F6F6B' },
  { id: 'rose', name: '雾粉紫', fit: '美妆、穿搭、情感', bg: '#FBF3F4', bg2: '#FFFFFF', a1: '#E46A8E', a2: '#A77BE6', text: '#2B1D24', body: '#4D3A44', muted: '#8C7480', line: 'rgba(0,0,0,.06)', hair: 'rgba(0,0,0,.10)', mp: '#C2456E' },
];

export const palette = (id?: string) => PALETTES.find((p) => p.id === id) ?? PALETTES[0];
