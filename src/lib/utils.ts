import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Keeps a post-login redirect on this site: a local path, never "//host" or "/\host". */
export function safeNext(next: unknown) {
  return typeof next === "string" && /^\/(?![/\\])/.test(next) ? next : "/";
}
