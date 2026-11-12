import { mount } from 'svelte';
import '../../ui/theme.css';
import Generator from './Generator.svelte';

/**
 * EN-S1 dev page: times `generateRoom` on this device and shows rooms. Dev server only (it is not a
 * build input): open `/apprentices-notebook/src/app/dev/generator.html` on the Vite server, on the
 * phone through the machine's address (`pnpm dev` already uses `--host`).
 */
const target = document.getElementById('app');
if (!target) throw new Error('#app missing');
mount(Generator, { target });
