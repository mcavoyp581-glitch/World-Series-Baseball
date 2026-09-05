import type { CareerSave, ManagerSave } from "../types";

const CAREER_KEY = "wsb-career-v1";
const MANAGER_KEY = "wsb-manager-v1";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadCareer(): CareerSave | null {
  return read<CareerSave>(CAREER_KEY);
}

export function saveCareer(save: CareerSave): void {
  localStorage.setItem(CAREER_KEY, JSON.stringify(save));
}

export function clearCareer(): void {
  localStorage.removeItem(CAREER_KEY);
}

export function loadManager(): ManagerSave | null {
  return read<ManagerSave>(MANAGER_KEY);
}

export function saveManager(save: ManagerSave): void {
  localStorage.setItem(MANAGER_KEY, JSON.stringify(save));
}

export function clearManager(): void {
  localStorage.removeItem(MANAGER_KEY);
}
