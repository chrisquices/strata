import type {InjectionKey, Ref} from 'vue';

export interface CodeBlockContext {
    code: Ref<string>;
    lineNumbers: Ref<boolean>;
    copied: Ref<boolean>;

    setCode(code: string): void;

    copyCode(): Promise<void>;
}

export const codeBlockContextKey = Symbol('CodeBlockContext') as InjectionKey<CodeBlockContext>;
