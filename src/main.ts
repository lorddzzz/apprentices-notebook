import { registerSW } from 'virtual:pwa-register';
import { mount } from 'svelte';
import App from './app/App.svelte';
import { lab } from './app/instance';
import { requestPersistence } from './app/save';
import './ui/theme.css';

registerSW({ immediate: true });
void requestPersistence();

const target = document.getElementById('app');
if (!target) throw new Error('#app missing');
mount(App, { target });

// Verification handle (dev builds only).
if (import.meta.env.DEV) Object.assign(window, { __lab: lab });
