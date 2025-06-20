import { opentelemetry } from '@elysiajs/opentelemetry';
import { DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { diag } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { config } from './config';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

// OTLP Trace Exporter Configuration
const traceExporter = new OTLPTraceExporter({
  url: `${config.OTEL_EXPORTER_OTLP_ENDPOINT}/traces`,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Basic ${config.OTEL_EXPORTER_OTLP_API_KEY}`,
  },
});

// Span Processor using BatchSpanProcessor for better performance
const spanProcessor = new BatchSpanProcessor(traceExporter);
export const instrumentation = opentelemetry({
  spanProcessors: [spanProcessor],
  instrumentations: [new PgInstrumentation()],
});
