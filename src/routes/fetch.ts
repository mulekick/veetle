// import modules
import {Router} from "express";

// import middlewares
import {mfetch, mfallback} from "../middlewares/fetch.ts";

const
    // eslint-disable-next-line new-cap
    xfetch:Router = Router();

xfetch
    // setup routes to serve fetch requests
    .get(`/inline`, mfetch)
    // fallback route for GET
    .get(`*`, mfallback);

export default xfetch;