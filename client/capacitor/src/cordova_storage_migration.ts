// Copyright 2026 The Outline Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {Capacitor} from '@capacitor/core';
import {CapacitorPluginOutline} from '@capacitor-plugin-outline';

// Set once the legacy storage has been read and replayed, so the off-screen
// WebView is only ever spun up on the first launch after the upgrade.
const MIGRATION_COMPLETED_KEY = 'cordova_migration_completed';
// Reading the legacy storage can fail transiently, so it is worth retrying on a
// later launch — but not forever, since each failed attempt costs the native
// timeout before the app can start.
const MIGRATION_ATTEMPTS_KEY = 'cordova_migration_attempts';
const MAX_MIGRATION_ATTEMPTS = 3;

function readAttempts(): number {
  const raw = window.localStorage.getItem(MIGRATION_ATTEMPTS_KEY);
  const parsed = raw === null ? 0 : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Replays the localStorage of a Cordova install into the Capacitor origin.
 *
 * The Cordova Android build ran from `file:///android_asset/www/` (config.xml
 * sets `AndroidInsecureFileModeEnabled`) while Capacitor serves
 * `https://localhost`. Chromium partitions storage by origin, so without this an
 * upgrading user launches into an empty app: no servers, no settings.
 *
 * Must be awaited before the app reads storage, otherwise the server repository
 * is built from the empty namespace and the migrated data only appears after a
 * restart. Never throws: a failure here must not stop the app from starting.
 */
export async function migrateLegacyCordovaStorageIfNeeded(): Promise<void> {
  // Android is the only platform whose origin changed. iOS keeps the Cordova
  // origin via `server.iosScheme`, and the browser build has nothing to migrate.
  if (Capacitor.getPlatform() !== 'android') {
    return;
  }
  if (window.localStorage.getItem(MIGRATION_COMPLETED_KEY) === 'true') {
    return;
  }

  const attempts = readAttempts();
  if (attempts >= MAX_MIGRATION_ATTEMPTS) {
    // Out of retries. Mark it done so we stop paying the timeout every launch.
    window.localStorage.setItem(MIGRATION_COMPLETED_KEY, 'true');
    return;
  }
  // Recorded before the call, so an attempt that kills the app still counts.
  window.localStorage.setItem(MIGRATION_ATTEMPTS_KEY, String(attempts + 1));

  let legacyStorage: string | null = null;
  try {
    ({legacyStorage} =
      await CapacitorPluginOutline.getLegacyCordovaLocalStorage());
  } catch (e) {
    console.warn('Could not read legacy Cordova localStorage', e);
    return;
  }

  if (legacyStorage === null) {
    // The native side could not read the legacy origin; retry on a later launch.
    return;
  }

  let legacy: unknown;
  try {
    legacy = JSON.parse(legacyStorage);
  } catch (e) {
    console.warn('Could not parse legacy Cordova localStorage', e);
    return;
  }
  if (typeof legacy !== 'object' || legacy === null || Array.isArray(legacy)) {
    console.warn('Legacy Cordova localStorage was not an object');
    return;
  }

  for (const [key, value] of Object.entries(
    legacy as Record<string, unknown>
  )) {
    // Never clobber a key this install has already written: whatever is in the
    // Capacitor origin is newer than the Cordova snapshot.
    if (
      typeof value === 'string' &&
      window.localStorage.getItem(key) === null
    ) {
      window.localStorage.setItem(key, value);
    }
  }

  // Only on a clean pass, so a transient failure above gets another attempt.
  window.localStorage.setItem(MIGRATION_COMPLETED_KEY, 'true');
  window.localStorage.removeItem(MIGRATION_ATTEMPTS_KEY);
}
