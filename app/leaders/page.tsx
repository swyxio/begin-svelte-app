import Link from 'next/link';
import { getTopUsers } from '@/lib/db';

export default async function LeadersPage() {
  const leaders = getTopUsers(100);

  return (
    <div style={{ padding: '10px 0' }}>
      <b>Leaders</b>
      <table className="leaders-table">
        <tbody>
          {leaders.map((user, index) => (
            <tr key={user.username}>
              <td style={{ textAlign: 'right', color: '#828282', minWidth: '30px' }}>{index + 1}.</td>
              <td>
                <Link href={`/user?id=${user.username}`}>{user.username}</Link>
              </td>
              <td style={{ color: '#828282' }}>{user.karma}</td>
            </tr>
          ))}
          {leaders.length === 0 && (
            <tr>
              <td colSpan={3} style={{ color: '#828282' }}>No users yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
