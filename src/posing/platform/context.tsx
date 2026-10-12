import { createContext } from 'react';
import type { Platform } from './types';
import { webPlatform } from './web';

/** The device under the tutor. The web app uses the default; the Android entry renders the tutor inside
 * `<PlatformContext value={androidPlatform}>`. Components read it with `use(PlatformContext)`. */
export const PlatformContext = createContext<Platform>(webPlatform);
