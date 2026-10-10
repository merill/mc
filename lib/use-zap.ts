"use client"

import * as React from "react"

import { siteConfig } from "@/config/site"

export type ZapState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "unavailable" }

// One request per path per page view, shared by every component that asks.
const requests = new Map<string, Promise<unknown>>()

function load<T>(path: string): Promise<T> {
  let request = requests.get(path) as Promise<T> | undefined
  if (!request) {
    request = fetch(`${siteConfig.zap.url}/api/v1${path}`, {
      credentials: "omit",
    }).then((response) =>
      response.ok ? (response.json() as Promise<T>) : Promise.reject()
    )
    requests.set(path, request)
  }
  return request
}

/**
 * Reads a zap.ms API path in the browser. Any failure, including a post zap
 * does not know yet, is "unavailable": the caller still links to zap.ms.
 */
export function useZap<T>(path: string): ZapState<T> {
  const [state, setState] = React.useState<ZapState<T>>({ status: "loading" })

  React.useEffect(() => {
    let isMounted = true
    setState({ status: "loading" })
    load<T>(path)
      .then((data) => isMounted && setState({ status: "ready", data }))
      .catch(() => isMounted && setState({ status: "unavailable" }))
    return () => {
      isMounted = false
    }
  }, [path])

  return state
}
