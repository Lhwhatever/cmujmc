import { router } from '../../trpc';
import template from './template';
import quiz from './quiz';

const wwydRouter = router({
  template,
  quiz,
});

export default wwydRouter;
