import '@testing-library/jest-dom';

// Polyfill for TextEncoder/TextDecoder in Jest (Node < 11)
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Ensure the API client points to the correct backend for tests
process.env.VITE_API_BASE_URL = 'http://localhost:8000';
