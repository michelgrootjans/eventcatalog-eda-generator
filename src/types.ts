import {Event} from "@eventcatalog/types";

export type AsyncAPIPluginOptions = {
  pathToSpec: string | string[];
  versionEvents?: boolean;
  externalAsyncAPIUrl?: string;
  renderMermaidDiagram?: boolean;
  renderNodeGraph?: boolean;
  domainName?: string;
  domainSummary?: string;
  catalogDirectory?: string,
};

export type AsyncApiDocument = { domain: AsyncApiDomain | undefined; service: AsyncApiService; events: Event[] };

export type AsyncApiDomain = {
  name: string,
  summary: string,
};

export type AsyncApiService = {
  name: string,
  summary: string,
};

export type AsyncApiEvent = {
  name: string,
  summary: string,
  version: string,
  producers: string[],
  consumers: string[],
  externalLinks: {label: string, url: string}[],
  schema: string,
};