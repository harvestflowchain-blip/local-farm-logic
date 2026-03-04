
DROP TRIGGER IF EXISTS update_feature_requests_updated_at ON public.feature_requests;
CREATE TRIGGER update_feature_requests_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
