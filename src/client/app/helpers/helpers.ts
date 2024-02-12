// import modules
import React from "react";
// vite supports client-side npm modules bundling ...
import pepe from "@mulekick/pepe-ascii";

const
    requestAsync = async(route:string, hydrate:React.Dispatch<React.SetStateAction<string>>, body:FormData | null = null):Promise<void> => {
        try {
            const
                // post form data
                readable = await fetch(route, body ? {method: `POST`, body} : {method: `GET`});
            // parse response stream into a string, update state, render
            hydrate(await readable.text());
        } catch (e) {
            // let's throw
        }
    },
    // random number between 2 values
    rnd = (lb:number, ub:number):number => lb + Math.round(Math.random() * (ub - lb)),
    // use an npm module client side
    getPepe = ():string => {
        const
            // all pepes
            pepes = Array.from(Object.values(pepe));
        // return a random pepe (typescript situation)
        return pepes.at(rnd(0, pepes.length - 1)) as unknown as string;
    };

export {requestAsync, getPepe};