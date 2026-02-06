import { DbItem } from '@/lib/db';
import { CommentItem } from './CommentItem';

interface CommentTreeProps {
  comments: DbItem[];
  allComments: Map<number, DbItem[]>;
  depth?: number;
  userVotes?: Map<number, string>;
  currentUser?: { userId: number; username: string } | null;
  canDownvote?: boolean;
}

export function CommentTree({
  comments,
  allComments,
  depth = 0,
  userVotes = new Map(),
  currentUser = null,
  canDownvote = false,
}: CommentTreeProps) {
  return (
    <div className="comment-tree">
      {comments.map((comment) => {
        const children = allComments.get(comment.id) || [];
        return (
          <div key={comment.id}>
            <CommentItem
              comment={comment}
              depth={depth}
              userVote={userVotes.get(comment.id) || null}
              currentUser={currentUser}
              canDownvote={canDownvote}
            />
            {children.length > 0 && (
              <CommentTree
                comments={children}
                allComments={allComments}
                depth={depth + 1}
                userVotes={userVotes}
                currentUser={currentUser}
                canDownvote={canDownvote}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Build a map of parent_id -> children comments for efficient tree rendering.
 */
export function buildCommentTree(comments: DbItem[]): Map<number, DbItem[]> {
  const map = new Map<number, DbItem[]>();
  for (const comment of comments) {
    const parentId = comment.parent_id!;
    if (!map.has(parentId)) {
      map.set(parentId, []);
    }
    map.get(parentId)!.push(comment);
  }
  return map;
}
