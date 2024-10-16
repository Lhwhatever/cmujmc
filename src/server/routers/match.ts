import { publicProcedure, router } from '../trpc';

const matchRouter = router({
  list: publicProcedure.query(async (opts) => {

  }),
});

export default matchRouter;