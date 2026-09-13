"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function fullName(s) {
  return [s.first_name, s.infix, s.last_name].filter(Boolean).join(" ");
}

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");

  // add form
  const [newNumber, setNewNumber] = useState("");
  const [newFirst, setNewFirst] = useState("");
  const [newInfix, setNewInfix] = useState("");
  const [newLast, setNewLast] = useState("");
  const [addError, setAddError] = useState("");

  // edit state
  const [editingId, setEditingId] = useState(null);
  const [editNumber, setEditNumber] = useState("");
  const [editFirst, setEditFirst] =
