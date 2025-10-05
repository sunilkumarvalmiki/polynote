declare module 'isomorphic-dompurify' {
  namespace DOMPurify {
    interface Config {
      ALLOWED_TAGS?: string[];
      ALLOWED_ATTR?: string[];
      KEEP_CONTENT?: boolean;
      RETURN_DOM?: boolean;
      RETURN_DOM_FRAGMENT?: boolean;
      RETURN_DOM_IMPORT?: boolean;
      RETURN_TRUSTED_TYPE?: boolean;
      FORCE_BODY?: boolean;
      SANITIZE_DOM?: boolean;
      IN_PLACE?: boolean;
      [key: string]: any;
    }
  }
  
  interface DOMPurifyI {
    sanitize(dirty: string | Node, cfg?: DOMPurify.Config): string;
    addHook(hook: string, cb: (node: Element, data: any) => void): void;
    removeHook(hook: string): void;
    setConfig(cfg: DOMPurify.Config): void;
  }
  
  const DOMPurify: DOMPurifyI;
  export default DOMPurify;
}