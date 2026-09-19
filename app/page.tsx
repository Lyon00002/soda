import { ProductExperience } from '@/components/layout/ProductExperience';

/**
 * The route is a thin server component. Everything below the experience shell
 * that does not need interactivity stays server-rendered inside it.
 */
export default function Page() {
  return <ProductExperience />;
}
