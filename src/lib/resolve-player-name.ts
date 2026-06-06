interface PlayerNameSource {
  nickname?: string | null;
  name?: string | null;
}

function nonEmpty(value: string | null | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

export function resolvePlayerName(usuario: PlayerNameSource): string {
  return nonEmpty(usuario.nickname) ?? nonEmpty(usuario.name) ?? 'Unknown';
}

export function resolvePlayerNameFromMap(
  uid: string,
  usuarios: Record<string, PlayerNameSource>,
): string {
  const usuario = usuarios[uid];
  if (!usuario) return 'Unknown';
  return resolvePlayerName(usuario);
}
