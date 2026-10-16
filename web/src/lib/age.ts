/** Calendar-year age from a locked birth year (no month/day collected). */

export function currentCalendarYear(now = new Date()): number {
  return now.getFullYear();
}

/** Convert the age the user types at signup into a birth year. */
export function birthYearFromAge(age: number, now = new Date()): number {
  return currentCalendarYear(now) - age;
}

/** Display age that ticks up each calendar year. */
export function ageFromBirthYear(
  birthYear: number | null | undefined,
  now = new Date()
): number | null {
  if (birthYear == null || !Number.isFinite(birthYear)) return null;
  const age = currentCalendarYear(now) - birthYear;
  if (age < 18 || age > 120) return null;
  return age;
}

/** Prefer birth_year; fall back to a stored age snapshot for older rows. */
export function resolveProfileAge(
  birthYear: number | null | undefined,
  storedAge: number | null | undefined,
  now = new Date()
): number {
  const fromYear = ageFromBirthYear(birthYear, now);
  if (fromYear != null) return fromYear;
  if (storedAge != null && storedAge >= 18) return storedAge;
  return 0;
}
