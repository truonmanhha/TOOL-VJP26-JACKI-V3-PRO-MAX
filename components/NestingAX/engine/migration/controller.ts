export interface AXMigrationController {
  useEngineRender: boolean;
  useLegacyCompatibility: boolean;
}

export function createAXMigrationController(): AXMigrationController {
  return {
    useEngineRender: true,
    useLegacyCompatibility: true,
  };
}
