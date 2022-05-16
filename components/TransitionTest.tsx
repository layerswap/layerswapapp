import React, { useState, useRef, useEffect } from "react";
import { Transition } from "@headlessui/react";

function Test() {
  const [isShowing, setIsShowing] = useState(false)

  return (
    <>
      <button onClick={() => setIsShowing((isShowing) => !isShowing)}>
        Toggle
      </button>
      <Transition
        show={isShowing}
        enter="transform transition ease-in-out duration-[3000ms]"
        enterFrom="translate-x-96 opacity-0"
        enterTo="opacity-100"
        leave="transform transition ease-in-out duration-[3000ms] "
        leaveFrom="translate-x-0 opacity-100"
        leaveTo="-translate-x-full opacity-0"
      >
        I will fade in and out
      </Transition>
    </>
  )

}

export default Test;