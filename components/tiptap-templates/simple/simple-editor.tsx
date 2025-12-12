"use client";

import { useEffect, useRef, useState } from "react";
import {
  EditorContent,
  useEditor,
  type Content,
  type Editor,
} from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Selection } from "@tiptap/extensions";

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover";
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";

// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint";
import { useWindowSize } from "@/hooks/use-window-size";
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";

// --- Components ---
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle";

// --- Lib ---
import {
  handleImageUpload,
  MAX_FILE_SIZE,
  deleteImageFromStorage,
} from "@/lib/tiptap-utils";

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss";

import { useThrottledCallback } from "@/hooks/use-throttled-callback";
import { CommentMark } from "@/components/tiptap-extension/comment-mark";
import {
  subscribeComments,
  createComment,
  updateComment,
  deleteComment,
} from "@/lib/comments";
import type { CommentData } from "@/types";
import { MessageSquarePlus } from "lucide-react";
import CommentsSidebar from "@/components/tiptap-templates/simple/comments-sidebar";

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  isMobile: boolean;
}) => {
  return (
    <>
      <Spacer />
      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        <ListDropdownMenu
          types={["bulletList", "orderedList", "taskList"]}
          portal={isMobile}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      <ToolbarGroup>
        <ThemeToggle />
      </ToolbarGroup>
    </>
  );
};

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link";
  onBack: () => void;
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
);

export function SimpleEditor({
  content,
  onChange,
  userId,
  noteId,
}: {
  content?: Content;
  onChange?: (json: JSONContent) => void;
  userId?: string;
  noteId?: string;
}) {
  const isMobile = useIsBreakpoint();
  const { height } = useWindowSize();
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  );
  const toolbarRef = useRef<HTMLDivElement>(null);
  const prevImageUrlsRef = useRef<Set<string>>(new Set());
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const pendingCommentIdRef = useRef<string | null>(null);
  const [hasPendingComment, setHasPendingComment] = useState(false);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  const getImageUrls = (json: JSONContent): string[] => {
    const urls: string[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const n = node as {
        type?: string;
        attrs?: { src?: unknown };
        content?: unknown[];
      };
      if (n.type === "image" && typeof n.attrs?.src === "string") {
        urls.push(n.attrs.src);
      }
      if (Array.isArray(n.content)) {
        n.content.forEach(walk);
      }
    };
    walk(json);
    return urls;
  };

  const handleUpdate = useThrottledCallback(
    () => {
      const ed = editorRef.current;
      if (!ed) return;
      const json = ed.getJSON();
      onChange?.(json);
      const current = new Set(getImageUrls(json));
      const prev = prevImageUrlsRef.current;
      for (const url of prev) {
        if (
          !current.has(url) &&
          /^https:\/\/firebasestorage\.googleapis\.com\//.test(url)
        ) {
          void deleteImageFromStorage(url);
        }
      }
      prevImageUrlsRef.current = current;
    },
    400,
    [onChange]
  );

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
      handleClickOn: (_view, _pos, node) => {
        try {
          const clickedNode = node as unknown as {
            isText?: boolean;
            marks?: Array<{
              type: { name: string };
              attrs: Record<string, unknown>;
            }>;
          };
          if (clickedNode?.isText && Array.isArray(clickedNode.marks)) {
            const m = clickedNode.marks.find(
              (mk) => mk.type.name === "comment"
            );
            const id = (m?.attrs?.id as string | undefined) || null;
            if (id) {
              setActiveCommentId(id);
              setIsCommentsOpen(true);
            }
          }
        } catch {
          /* noop */
        }
        return false;
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      CommentMark,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
    ],
    content,
    onUpdate: handleUpdate,
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!editor || content === undefined) return;

    // Apenas seta o conteúdo no primeiro render ou quando vem de fora
    if (isFirstRender.current) {
      editor.commands.setContent(content as Content);
      isFirstRender.current = false;
      const currentJson = editor.getJSON();
      prevImageUrlsRef.current = new Set(getImageUrls(currentJson));
    }
  }, [editor, content]);

  useEffect(() => {
    if (!userId || !noteId) return;
    const unsub = subscribeComments(userId, noteId, (list) =>
      setComments(list)
    );
    return () => unsub();
  }, [userId, noteId]);

  const selectionHasComment = () => {
    if (!editor) return false;
    const { state } = editor;
    const { from, to } = state.selection;
    let found = false;
    state.doc.nodesBetween(from, to, (node) => {
      if (node.isText && node.marks.some((m) => m.type.name === "comment")) {
        found = true;
        return false;
      }
      return true;
    });
    return found;
  };

  const selectionHasText = () => {
    if (!editor) return false;
    const { selection } = editor.state;
    return !selection.empty;
  };

  const applyCommentMark = (id: string) => {
    if (!editor) return false;
    return editor.chain().focus().setMark("comment", { id }).run();
  };

  const selectCommentById = (id: string) => {
    if (!editor) return;
    const { state, view } = editor;
    let from: number | null = null;
    let to: number | null = null;
    state.doc.descendants((node, pos) => {
      if (!node.isText) return true;
      const has = node.marks.some(
        (m) =>
          m.type.name === "comment" &&
          (m.attrs as Record<string, unknown>)["id"] === id
      );
      if (has) {
        from = pos;
        to = pos + node.nodeSize;
        return false;
      }
      return true;
    });
    if (from !== null && to !== null) {
      editor.commands.focus();
      const tr = state.tr
        .setSelection(TextSelection.create(state.doc, from, to))
        .scrollIntoView();
      view.dispatch(tr);
    }
  };

  const removeCommentMarks = (id: string) => {
    if (!editor) return;
    const { state, view } = editor;
    const markType = state.schema.marks.comment;
    let tr = state.tr;
    state.doc.descendants((node, pos) => {
      if (!node.isText) return true;
      const has = node.marks.some(
        (m) =>
          m.type === markType &&
          (m.attrs as Record<string, unknown>)["id"] === id
      );
      if (has) {
        tr = tr.removeMark(pos, pos + node.nodeSize, markType);
      }
      return true;
    });
    view.dispatch(tr);
  };

  const handlePendingTextChange = async (text: string) => {
    setNewCommentText(text);
    if (!userId || !noteId) return;
    if (hasPendingComment && pendingCommentIdRef.current) {
      await updateComment(userId, noteId, pendingCommentIdRef.current, { text });
    }
  };

  const handleEditCommentText = async (id: string, text: string) => {
    if (!userId || !noteId) return;
    await updateComment(userId, noteId, id, { text });
  };

  const handleDeleteComment = async (id: string) => {
    if (!userId || !noteId) return;
    await deleteComment(userId, noteId, id);
    removeCommentMarks(id);
  };

  const handleSelectComment = (id: string) => {
    setActiveCommentId(id);
    selectCommentById(id);
  };

  const handleToggleEdit = (id: string) => {
    setEditingId((prev) => (prev === id ? null : id));
  };

  const rect = useCursorVisibility({
    editor,
    overlayHeight: 0,
  });

  useEffect(() => {
    if (!activeCommentId) return;
    const el = document.getElementById(`comment-${activeCommentId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeCommentId]);

  return (
    <div className="flex flex-row w-full min-h-screen items-start">
      <aside
        className="min-h-screen transition-[width] duration-300 ease-in-out"
        style={{
          width: isMobile ? "100%" : isCommentsOpen ? "80%" : "100%",
        }}
      >
        <Toolbar
          variant="fixed"
          ref={toolbarRef}
          style={{
            ...(isMobile
              ? {
                  bottom: `calc(100% - ${height - rect.y}px)`,
                }
              : {}),
          }}
        >
          {!isMobile || mobileView === "main" ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              isMobile={isMobile}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          )}
          <ToolbarSeparator />
          <ToolbarGroup>
            <Button
              aria-label="Adicionar comentário"
              onClick={async () => {
                if (
                  selectionHasText() &&
                  !selectionHasComment() &&
                  userId &&
                  noteId &&
                  editor
                ) {
                  const { state } = editor;
                  const { from, to } = state.selection;
                  const snippet = state.doc.textBetween(from, to, "\n");
                  const created = await createComment(userId, noteId, {
                    text: "",
                    snippet,
                  });
                  pendingCommentIdRef.current = created.id;
                  setHasPendingComment(true);
                  setNewCommentText("");
                  applyCommentMark(created.id);
                  setActiveCommentId(created.id);
                }
                setIsCommentsOpen(true);
              }}
            >
              <MessageSquarePlus className="tiptap-button-icon mr-1" />
              Comentar
            </Button>
          </ToolbarGroup>
        </Toolbar>

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </aside>
      <CommentsSidebar
        open={isCommentsOpen}
        onOpenChange={(open) => {
          setIsCommentsOpen(open);
          if (!open) {
            setNewCommentText("");
            pendingCommentIdRef.current = null;
            setHasPendingComment(false);
          }
        }}
        desktopWidth="20%"
        title="Comentários"
        hasPendingComment={hasPendingComment}
        newCommentText={newCommentText}
        onChangePendingText={handlePendingTextChange}
        comments={comments}
        editingId={editingId}
        onToggleEdit={handleToggleEdit}
        onSelectComment={handleSelectComment}
        onDeleteComment={handleDeleteComment}
        onEditCommentText={handleEditCommentText}
        activeId={activeCommentId}
      />
    </div>
  );
}
