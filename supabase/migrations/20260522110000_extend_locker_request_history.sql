ALTER TABLE public.locker_requests
  DROP CONSTRAINT IF EXISTS locker_requests_request_type_check;

ALTER TABLE public.locker_requests
  ADD CONSTRAINT locker_requests_request_type_check
  CHECK (request_type IN ('assign', 'move', 'release'));
