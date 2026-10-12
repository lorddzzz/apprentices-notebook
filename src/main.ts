import { registerSW } from 'virtual:pwa-register';
import { mount } from 'svelte';
import App from './app/App.svelte';
import { requestPersistence } from './app/save';
import './ui/theme.css';

registerSW({ immediate: true });
void requestPersistence();

const target = document.getElementById('app');
if (!target) throw new Error('#app missing');
mount(App, { target });
