import type { Sql } from "./sql";
import type { Person } from "./types";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role_title: string;
};

export function mapPerson(row: UserRow): Person {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    roleTitle: row.role_title,
  };
}

export async function listPeople(sql: Sql): Promise<Person[]> {
  const rows = await sql<UserRow>(
    "select id, email, name, role_title from users order by name asc",
  );
  return rows.map(mapPerson);
}

export async function findPersonByEmail(sql: Sql, email: string): Promise<Person | null> {
  const rows = await sql<UserRow>(
    "select id, email, name, role_title from users where email = $1",
    [email],
  );
  return rows[0] ? mapPerson(rows[0]) : null;
}

export async function findPersonById(sql: Sql, id: string): Promise<Person | null> {
  const rows = await sql<UserRow>(
    "select id, email, name, role_title from users where id = $1",
    [id],
  );
  return rows[0] ? mapPerson(rows[0]) : null;
}
