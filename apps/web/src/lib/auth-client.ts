'use client';

import { createAuthClient } from 'better-auth/react';

// Same-origin: the browser talks to /api/auth on the site it loaded from, with httpOnly
// cookies. Nothing about the session is kept in localStorage (spec 2).
export const authClient = createAuthClient();
