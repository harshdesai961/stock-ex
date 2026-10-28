import { base, node, react } from '@stock-ex/config/eslint';

export default [...base(import.meta.dirname), ...node(), ...react()];
