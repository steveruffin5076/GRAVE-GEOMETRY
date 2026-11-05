import { BALANCE } from '../config/balance.ts';
import { repeatableGain } from './stats.ts';
import { setActiveAmmo, type AmmoId } from './ammo.ts';
import { grantGrenadeType, type GrenadeId } from './grenades.ts';
import type { UpgradeDef } from './upgrades.ts';
import { unlockWeapon, type WeaponId, WEAPON_IDS } from './weapons.ts';

const UNLOCKABLE_WEAPONS: WeaponId[] = WEAPON_IDS.filter((w) => w !== 'pistol');

function weaponDef(id: WeaponId, minLevel: number, minWave: number, tier: 1 | 2 | 3): UpgradeDef {
  const w = BALANCE.weapons[id];
  return {
    id: `weapon_${id}`,
    category: 'weapon',
    name: id.toUpperCase(),
    description: () => `Equip ${id} (${w.damage} dmg, ${w.fireRate}/s)`,
    icon: 'weapon',
    tier,
    weight: 1,
    minLevel,
    minWave,
    unique: true,
    maxRank: 1,
    apply: (s) => unlockWeapon(s, id),
  };
}

function weaponMastery(id: WeaponId): UpgradeDef {
  return {
    id: `mastery_weapon_${id}`,
    category: 'weapon',
    name: `${id} Mastery`,
    description: (rank) => `+${Math.round(repeatableGain(0.03, rank - 1) * 100)}% weapon damage`,
    icon: 'weapon',
    tier: 2,
    weight: 0.6,
    minLevel: 8,
    minWave: 3,
    requires: [`weapon_${id}`],
    maxRank: null,
    apply: (s) => {
      s.ranks[`mastery_weapon_${id}`] = (s.ranks[`mastery_weapon_${id}`] ?? 0) + 1;
    },
  };
}

function ammoDef(id: AmmoId, name: string, minLevel: number, minWave: number, tier: 1 | 2 | 3): UpgradeDef {
  return {
    id: `ammo_${id}`,
    category: 'ammo',
    name,
    description: () => `Switch to ${name}`,
    icon: 'ammo',
    tier,
    weight: 1,
    minLevel,
    minWave,
    maxRank: 1,
    unique: true,
    apply: (s) => {
      setActiveAmmo(s, id);
      if (!s.owned.ammo.includes(`ammo_${id}`)) s.owned.ammo.push(`ammo_${id}`);
    },
  };
}

function attachDef(key: keyof typeof BALANCE.attachments, minLevel: number): UpgradeDef {
  const def = BALANCE.attachments[key];
  return {
    id: `attach_${key}`,
    category: 'attachment',
    name: key.replace(/^\w/, (c) => c.toUpperCase()),
    description: (rank) => `Rank ${rank}`,
    icon: 'attachment',
    tier: 1,
    weight: 0.95,
    minLevel,
    minWave: 1,
    maxRank: def.maxRank,
    apply: (s) => {
      s.ranks[`attach_${key}`] = (s.ranks[`attach_${key}`] ?? 0) + 1;
      s.owned.attachments.push(`attach_${key}`);
    },
  };
}

function grenadeDef(id: GrenadeId, name: string, minLevel: number, tier: 1 | 2 | 3): UpgradeDef {
  return {
    id: `grenade_${id}`,
    category: 'grenade',
    name,
    description: () => `Unlock ${name}`,
    icon: 'grenade',
    tier,
    weight: 0.9,
    minLevel,
    minWave: 1,
    unique: true,
    maxRank: 1,
    apply: (s) => grantGrenadeType(s, id),
  };
}

function skillDef(
  key: keyof typeof BALANCE.skills,
  name: string,
  minLevel: number,
  tier: 1 | 2 | 3 = 1,
): UpgradeDef {
  return {
    id: `skill_${key}`,
    category: 'skill',
    name,
    description: (rank) => `Rank ${rank}`,
    icon: 'skill',
    tier,
    weight: 1,
    minLevel,
    minWave: 1,
    maxRank: null,
    apply: (s) => {
      s.ranks[`skill_${key}`] = (s.ranks[`skill_${key}`] ?? 0) + 1;
      s.owned.skills.push(`skill_${key}`);
    },
  };
}

export const CATALOG_UPGRADE_DEFS: UpgradeDef[] = [
  ...UNLOCKABLE_WEAPONS.map((id, i) => weaponDef(id, 2 + i, 1 + Math.floor(i / 3), i > 5 ? 3 : 2)),
  ...UNLOCKABLE_WEAPONS.map((id) => weaponMastery(id)),
  ammoDef('hollow', 'Hollow Point', 2, 1, 1),
  ammoDef('ap', 'Armour Piercing', 4, 2, 2),
  ammoDef('incendiary', 'Incendiary', 6, 3, 2),
  ammoDef('cryo', 'Cryo', 5, 2, 2),
  ammoDef('shock', 'Shock', 7, 4, 2),
  ammoDef('explosive', 'Explosive', 8, 5, 3),
  attachDef('extended', 2),
  attachDef('drum', 5),
  attachDef('suppressor', 3),
  attachDef('brake', 3),
  attachDef('reddot', 4),
  attachDef('laser', 4),
  attachDef('rapid', 6),
  attachDef('heavy', 5),
  attachDef('stabiliser', 7),
  grenadeDef('frag', 'Frag', 3, 2),
  grenadeDef('molotov', 'Molotov', 5, 2),
  grenadeDef('cryo', 'Cryo Bomb', 6, 2),
  grenadeDef('emp', 'EMP', 8, 3),
  grenadeDef('cluster', 'Cluster', 9, 3),
  grenadeDef('decoy', 'Decoy', 4, 1),
  skillDef('fleetfoot', 'Fleetfoot', 1),
  skillDef('vitality', 'Vitality', 1),
  skillDef('fasthands', 'Fast Hands', 2),
  skillDef('magnet', 'Magnet', 2),
  skillDef('deadeye', 'Deadeye', 3),
  skillDef('scholar', 'Scholar', 3),
  skillDef('scavenger', 'Scavenger', 4),
  skillDef('adrenaline', 'Adrenaline', 5),
  skillDef('bulwark', 'Bulwark', 4),
  skillDef('thorns', 'Thorns', 5),
  skillDef('secondwind', 'Second Wind', 6, 2),
  skillDef('dashmaster', 'Dash Master', 4),
  skillDef('bloodlust', 'Bloodlust', 5),
  skillDef('arsenal', 'Arsenal', 6, 2),
  skillDef('regenerator', 'Regenerator', 3),
  skillDef('executioner', 'Executioner', 7, 2),
];

export const ALL_CATALOG_IDS = CATALOG_UPGRADE_DEFS.map((d) => d.id);
