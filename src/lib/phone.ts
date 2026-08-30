export function normalizeMkPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let national = digits;

  if (digits.startsWith("389")) {
    national = digits.slice(3);
  } else if (digits.startsWith("0")) {
    national = digits.slice(1);
  }

  if (/^7\d{7}$/.test(national)) {
    return `+389${national}`;
  }

  return null;
}

export function displayMkPhone(e164: string): string {
  const national = e164.replace(/^\+389/, "0");
  if (national.length === 9) {
    return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  }
  return e164;
}
