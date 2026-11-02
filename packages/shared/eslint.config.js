import { base, node } from '@stock-ex/config/eslint';

export default [...base(import.meta.dirname), ...node()];
