interface SecurityPolicy {
    frameOptions: 'DENY' | 'SAMEORIGIN';
    csp: ContentSecurityPolicy;
    cache: CachePolicy;
    globalOverrides?: {
        'x-content-type-options'?: string;
        'referrer-policy'?: string;
        [key: string]: string | undefined;
    };
}
interface RouteSecurityRule {
    name: string;
    matcher: (path: string) => boolean;
    policy: SecurityPolicy;
    priority: number; // Lower numbers = higher priority
}

interface ContentSecurityPolicy {
    'default-src'?: string;
    'script-src'?: string;
    'style-src'?: string;
    'img-src'?: string;
    'font-src'?: string;
    'connect-src'?: string;
    'media-src'?: string;
    'object-src'?: string;
    'base-uri'?: string;
    'form-action'?: string;
    'frame-src'?: string;
    'frame-ancestors'?: string;
    'manifest-src'?: string;
    'worker-src'?: string;
    'child-src'?: string;
    'navigate-to'?: string;
    'upgrade-insecure-requests'?: boolean;
    'block-all-mixed-content'?: boolean;
    'report-uri'?: string;
    'report-to'?: string;
}

interface CachePolicy {
    control: string;
    pragma?: string;
    expires?: string;
}

// Environment-based configuration with validation
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';
const isProduction = NODE_ENV === 'production';

// Security headers configuration from environment
const SECURITY_HEADERS_ENABLED = process.env.SECURITY_HEADERS_ENABLED !== 'false';
const CSP_REPORT_ONLY = process.env.CSP_REPORT_ONLY !== 'false';

// Server and client configuration from environment
const SERVER_PROTOCOL = process.env.SERVER_PROTOCOL || 'http';
const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const SERVER_PORT = process.env.SERVER_PORT || '4000';
const CLIENT_PROTOCOL = process.env.CLIENT_PROTOCOL || 'http';
const CLIENT_HOST = process.env.CLIENT_HOST || 'localhost:4000';

// Build URLs from environment variables
const SERVER_URL = `${SERVER_PROTOCOL}://${SERVER_HOST}:${SERVER_PORT}`;
const CLIENT_URL = `${CLIENT_PROTOCOL}://${CLIENT_HOST}`;

if (!['development', 'production', 'test'].includes(NODE_ENV)) {
    console.warn(`Unknown NODE_ENV: ${NODE_ENV}, defaulting to development`);
}

// Reusable CSP sources
const SELF = "'self'";
const UNSAFE_INLINE = "'unsafe-inline'";
const UNSAFE_EVAL = "'unsafe-eval'";
const NONE = "'none'";
const DATA = 'data:';
const BLOB = 'blob:';
const HTTPS = 'https:';
const WS = 'ws:';
const WSS = 'wss:';

// Domain configurations for separate frontend/backend projects
const DANNIE_DOMAINS = '*.grvt.cc api.grvt.cc mes.grvt.cc';

// Frontend project URLs (separate from backend) - using environment variables
const FRONTEND_URLS = isDevelopment
    ? `${CLIENT_URL} ${CLIENT_URL.replace('http:', 'https:')}` // Support both HTTP and HTTPS for dev
    : 'https://grvt.cc https://www.grvt.cc https://mes.grvt.cc'; // Production frontend domain

// Allowed origins for cross-origin API requests - using environment variables
const ALLOWED_ORIGINS = isDevelopment ? `${CLIENT_URL} ${CLIENT_URL.replace('http:', 'https:')}` : 'https://grvt.cc https://www.grvt.cc https://mes.grvt.cc';

// Export environment configuration for external use
export { SECURITY_HEADERS_ENABLED, CSP_REPORT_ONLY, SERVER_URL, CLIENT_URL };

// Nonce placeholder for production CSP
export const NONCE_PLACEHOLDER = 'nonce-{NONCE_PLACEHOLDER}';

// Environment-specific CSP sources for separate backend API
const DEV_SCRIPT_SRC = isDevelopment ? `${SELF} ${UNSAFE_INLINE} ${UNSAFE_EVAL}` : `${SELF} ${NONCE_PLACEHOLDER}`; // Backend doesn't serve frontend scripts

const DEV_STYLE_SRC = isDevelopment ? `${SELF} ${UNSAFE_INLINE}` : `${SELF} ${NONCE_PLACEHOLDER}`; // Backend minimal style support

// Connect-src allows frontend to make API requests to backend
const DEV_CONNECT_SRC = isDevelopment ? `${SELF} ${HTTPS} ${WS} ${WSS} ${DANNIE_DOMAINS} ${FRONTEND_URLS}` : `${SELF} ${WS} ${WSS} ${DANNIE_DOMAINS} ${FRONTEND_URLS}`;

// Simplified config - remove unused route definitions
const policies = {
    strict: {
        frameOptions: 'DENY' as const,
        csp: {
            'default-src': SELF,
            'script-src': DEV_SCRIPT_SRC,
            'style-src': DEV_STYLE_SRC,
            'img-src': `${SELF} ${DATA} ${BLOB}`, // Minimal image support for API responses
            'font-src': `${SELF} ${DATA}`,
            'connect-src': DEV_CONNECT_SRC,
            'media-src': NONE, // Backend API doesn't serve media
            'object-src': NONE,
            'base-uri': SELF,
            'form-action': SELF,
            'frame-ancestors': NONE, // Prevent embedding backend API in frames
            'upgrade-insecure-requests': isProduction,
        },
        cache: {
            control: 'no-store, no-cache, must-revalidate, proxy-revalidate',
            pragma: 'no-cache',
            expires: '0',
        },
        globalOverrides: {},
    },

    moderate: {
        frameOptions: 'SAMEORIGIN' as const,
        csp: {
            'default-src': SELF,
            'script-src': DEV_SCRIPT_SRC,
            'style-src': DEV_STYLE_SRC,
            'img-src': `${SELF} ${DATA} ${BLOB}`, // For API documentation or error pages
            'font-src': SELF, // Minimal font support
            'connect-src': DEV_CONNECT_SRC,
            'frame-ancestors': NONE, // Backend API shouldn't be framed
        },
        cache: {
            control: 'private, max-age=300',
        },
        globalOverrides: {},
    },

    minimal: {
        frameOptions: 'SAMEORIGIN' as const,
        csp: {
            'default-src': SELF,
            'frame-ancestors': SELF,
        },
        cache: {
            control: isProduction ? 'public, max-age=3600' : 'public, max-age=300', // 1 hour max in production for timely security updates
        },
        globalOverrides: {
            'referrer-policy': 'no-referrer',
        },
    },

    staticAssets: {
        frameOptions: 'DENY' as const,
        csp: {
            'default-src': NONE, // Static assets don't need any CSP permissions
        },
        cache: {
            control: isProduction ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
        },
        globalOverrides: {
            'x-content-type-options': 'nosniff',
            'access-control-allow-origin': ALLOWED_ORIGINS, // Allow frontend to fetch static assets
        },
    },
} satisfies Record<string, SecurityPolicy>;

const createWildcardMatcher =
    (patterns: string[]) =>
    (path: string): boolean => {
        return patterns.some((pattern) => {
            if (pattern === path) return true;

            if (pattern.includes('*')) {
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                return regex.test(path);
            }

            if (pattern.endsWith('/')) {
                return path.startsWith(pattern);
            }

            return path.startsWith(pattern);
        });
    };

const createCaseInsensitiveWildcardMatcher =
    (patterns: string[]) =>
    (path: string): boolean => {
        const lowerPath = path.toLowerCase();
        return patterns.some((pattern) => {
            const lowerPattern = pattern.toLowerCase();

            if (lowerPattern === lowerPath) return true;

            if (lowerPattern.includes('*')) {
                const regex = new RegExp('^' + lowerPattern.replace(/\*/g, '.*') + '$', 'i');
                return regex.test(path);
            }

            if (lowerPattern.endsWith('/')) {
                return lowerPath.startsWith(lowerPattern);
            }

            return lowerPath.startsWith(lowerPattern);
        });
    };

// Declarative Route Security Map (sorted by priority)
export const routeSecurityMap: RouteSecurityRule[] = [
    // 1. Authentication routes - HIGHEST PRIORITY
    {
        name: 'auth',
        priority: 1,
        matcher: createWildcardMatcher(['/auth*', '/password*', '/login*', '/signup*', '/reset*', '/verify*', '*/auth/*', '*/login', '*/register']),
        policy: policies.strict,
    },

    // 2. Admin routes - HIGH PRIORITY
    {
        name: 'admin',
        priority: 2,
        matcher: createWildcardMatcher(['/admin*', '*/admin/*']),
        policy: policies.strict,
    },

    // 3. API Documentation routes (Swagger, health checks) - EARLY PRIORITY
    {
        name: 'apiDocs',
        priority: 3,
        matcher: createWildcardMatcher(['/docs*', '/swagger*', '/api-docs*', '/health*', '/status*', '/metrics*']),
        policy: {
            ...policies.minimal,
            globalOverrides: {
                'access-control-allow-origin': '*', // Public API docs can be accessed from anywhere
                'x-content-type-options': 'nosniff',
            },
        },
    },

    // 4. Static assets served by backend - EARLY to catch before API routes
    {
        name: 'publicAssets',
        priority: 4,
        matcher: createCaseInsensitiveWildcardMatcher([
            '/assets/*',
            '/uploads/*',
            '/static/*',
            '/public/*',
            '*.css',
            '*.js',
            '*.png',
            '*.jpg',
            '*.jpeg',
            '*.gif',
            '*.svg',
            '*.ico',
            '*.woff*',
            '*.ttf',
            '*.eot',
            '*.map',
            '*.webp',
            '*.avif',
        ]),
        policy: policies.staticAssets,
    },

    // 5. Sensitive endpoints - BEFORE general API
    {
        name: 'sensitive',
        priority: 5,
        matcher: (path: string): boolean => {
            const sensitivePatterns = ['/users/profile*', '/users/me*', '/orders/*', '/account/*', '/settings/*', '*/profile', '*/dashboard', '*/checkout'];
            const matchesSensitive = createWildcardMatcher(sensitivePatterns)(path);
            const matchesUserPattern = /\/users\/[^/]+$/.test(path);
            return matchesSensitive || matchesUserPattern;
        },
        policy: {
            ...policies.moderate,
            cache: policies.strict.cache, // Strict caching for sensitive data
            globalOverrides: {},
        },
    },

    // 6. API routes - GENERAL (REST endpoints for frontend consumption)
    {
        name: 'api',
        priority: 6,
        matcher: createWildcardMatcher(['/api*', '*/api/*']),
        policy: {
            ...policies.moderate,
            globalOverrides: {},
        },
    },
].sort((a, b) => a.priority - b.priority); // Ensure priority sorting

// Validate route security map on import
if (routeSecurityMap.length === 0) {
    throw new Error('Route security map cannot be empty');
}

// Validate priorities are unique and sequential
const priorities = routeSecurityMap.map((rule) => rule.priority);
const uniquePriorities = new Set(priorities);
if (priorities.length !== uniquePriorities.size) {
    throw new Error('Route security priorities must be unique');
}

export const defaultPolicy: SecurityPolicy = {
    ...policies.moderate,
    cache: { control: 'private, max-age=0' },
    globalOverrides: {},
};

export { SecurityPolicy, ContentSecurityPolicy, CachePolicy, RouteSecurityRule };
