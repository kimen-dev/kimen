import { runVisualSuite } from './visual/harness';
import { narrowInputGallery } from './visual/input-narrow';

runVisualSuite({ ...narrowInputGallery, scheme: 'light' });
