// Minimal ambient declarations to make these Deno Edge Function files editable
// in editors/TypeScript environments that don't resolve remote Deno imports.

// Declare Deno global (very small surface area)
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Remote import for Deno std server (versions used in functions)
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "https://deno.land/std@0.190.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

// Shim for the ESM sh import of supabase-js used inside edge functions
declare module "https://esm.sh/@supabase/supabase-js@2.38.4" {
  export function createClient(...args: any[]): any;
}

// A fallback for other https://esm.sh/ imports that may appear
declare module "https://esm.sh/*" {
  const whatever: any;
  export default whatever;
}
