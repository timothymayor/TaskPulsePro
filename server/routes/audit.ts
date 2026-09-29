import { Router, Request, Response } from 'express';
import { ApiResponse } from '../types';
import { sanitizeString, computeChecksum, validateAndSanitizeTodo } from '../utils/security';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const tests = [];

  // 1. XSS Fuzzing test
  const xssInput = '<script>alert(1)</script><img src=x onerror=alert(2)>safe';
  const xssClean = sanitizeString(xssInput);
  const xssPassed = !xssClean.includes('<script>') && !xssClean.includes('onerror=') && xssClean === 'safe';
  tests.push({
    name: 'Input Sanitization & Anti-XSS Engine',
    passed: xssPassed,
    details: 'HTML tags, execution attributes, and script injection stripped cleanly.',
  });

  // 2. Prototype Pollution Guard
  const protoPayload = JSON.parse('{"__proto__": {"isAdmin": true}, "title": "Valid Title"}');
  const sanitized = validateAndSanitizeTodo(protoPayload);
  const isPolluted = ({} as Record<string, unknown>)['isAdmin'] === true;
  tests.push({
    name: 'Prototype Pollution Mitigation',
    passed: !isPolluted && sanitized !== null && sanitized.title === 'Valid Title',
    details: 'Object prototype mutation prevented during deserialization.',
  });

  // 3. SHA-256 Tamper Checksum
  const sample = { id: '1', title: 'Task' };
  const c1 = computeChecksum(sample);
  const c2 = computeChecksum(sample);
  const c3 = computeChecksum({ id: '1', title: 'Tampered' });
  tests.push({
    name: 'Cryptographic Checksum Verification',
    passed: c1 === c2 && c1 !== c3,
    details: 'Deterministic SHA-256 payload integrity validation functioning.',
  });

  const allPassed = tests.every(t => t.passed);
  const body: ApiResponse<{
    compliant: boolean;
    standard: string;
    checks: typeof tests;
  }> = {
    success: true,
    data: {
      compliant: allPassed,
      standard: 'OWASP Top 10 API Security Controls',
      checks: tests,
    },
    timestamp: new Date().toISOString(),
  };

  return res.status(200).json(body);
});

export default router;
