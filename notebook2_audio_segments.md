# Notebook 2 — Problems & Practice: Audio Segment Guide

## How This Notebook Works
Notebook 2 is built differently from Notebook 1. Every topic has three layers:
- **Theory file** (e.g., `array.md`) — concepts and complexity overview
- **Challenge file** (e.g., `two_sum_challenge.md`) — the problem statement
- **Solution file** (e.g., `two_sum_solution.md`) — approach, walkthrough, complexity

Always select all three layers when generating audio. NotebookLM will
automatically connect the problem to its solution and explain the approach.

---

## Quick Reference

| # | Segment | Core Files | Difficulty |
|---|---|---|---|
| 1 | Meta: Study Plan & Context | 5 | Beginner ⭐ Start Here |
| 2 | Arrays | 11 | Beginner |
| 3 | Strings | 11 | Beginner–Intermediate |
| 4 | Linked Lists | 11 | Intermediate |
| 5 | Stacks & Queues | 12 | Intermediate |
| 6 | Trees | 11 | Intermediate |
| 7 | Binary Search Trees | 10 | Intermediate |
| 8 | Graphs | 11 | Intermediate |
| 9 | Hash Tables, Heaps & Matrix | 13 | Intermediate |
| 10 | Sorting & Searching | 9 | Intermediate |
| 11 | Recursion & Backtracking | 9 | Intermediate–Hard |
| 12 | Dynamic Programming | 11 | Hard ⭐ Most Critical |
| 13 | Bit Manipulation | 11 | Hard |
| 14 | Tries & Advanced | 10 | Hard |

---

## Segments

---

### Segment 1 — Meta: Study Plan & Context
**Difficulty:** Beginner ⭐ Start Here Before Any Other Segment

**Select these sources:**
- `README.md`
- `coding-interview-prep.md`
- `coding-interview-study-plan.md`
- `coding-interview-rubrics.md`
- `study-cheatsheet.md`

**Priming Prompt:**
```
I am a final year BTech CSE student preparing for Google and top SWE interviews.
This is my orientation session before I begin solving problems.

Focus this audio on:
1. How a structured practice plan looks — what to study in what order
2. What interviewers are actually evaluating when they give a coding problem
   (rubrics, communication, edge cases, complexity)
3. The key habits that separate strong candidates from average ones
4. What the cheatsheet says I must know cold before any interview

This session is about building the right mindset, not solving problems yet.
```

---

### Segment 2 — Arrays
**Difficulty:** Beginner

**Select these sources:**
- `array.md`
- `two_sum_challenge.md` / `two_sum_solution.md`
- `move_zeroes_challenge.md` / `move_zeroes_solution.md`
- `mult_other_numbers_challenge.md` / `mult_other_numbers_solution.md`
- `prod_three_challenge.md` / `prod_three_solution.md`
- `merge_into_challenge.md` / `merge_into_solution.md`

**Extended Practice** *(add to this segment for a second session)*
- `add_digits_challenge.md` / `add_digits_solution.md`
- `sum_two_challenge.md` / `sum_two_solution.md`
- `new_int_challenge.md` / `new_int_solution.md`

**Priming Prompt:**
```
I am a final year BTech CSE student preparing for Google and top SWE interviews.

Focus this audio on array fundamentals through five problems. For each problem:
1. State the problem clearly in plain English
2. Explain the brute force first, then the optimal approach
3. State the time and space complexity of the optimal solution
4. Explain what array insight or trick makes the optimal solution possible
5. Ask: what follow-up question might an interviewer ask?

Start with the theory from array.md to set context, then walk through 
each problem. Do not skip complexity analysis for any problem.
```

---

### Segment 3 — Strings
**Difficulty:** Beginner–Intermediate

**Select these sources:**
- `string.md`
- `unique_chars_challenge.md` / `unique_chars_solution.md`
- `anagrams_challenge.md` / `anagrams_solution.md`
- `palindrome_challenge.md` / `palindrome_solution.md`
- `compress_challenge.md` / `compress_solution.md`
- `reverse_string_challenge.md` / `reverse_string_solution.md`

**Extended Practice** *(add for a second session)*
- `rotation_challenge.md` / `rotation_solution.md`
- `ransom_note_challenge.md` / `ransom_note_solution.md`
- `str_diff_challenge.md` / `str_diff_solution.md`
- `reverse_words_challenge.md` / `reverse_words_solution.md`
- `group_ordered_challenge.md` / `group_ordered_solution.md`

**Priming Prompt:**
```
I am a final year BTech CSE student preparing for Google and top SWE interviews.

Focus this audio on string manipulation through five problems. For each:
1. State the problem and its constraints
2. Explain the optimal approach and why it works
3. State time and space complexity
4. Highlight what string-specific insight is being tested 
   (e.g., character frequency, in-place manipulation, two-pointer)

After covering all problems, summarize: what are the three most common 
string patterns that appear across all these problems?
```

---

### Segment 4 — Linked Lists
**Difficulty:** Intermediate

**Select these sources:**
- `linked-list.md`
- `linked_list_challenge.md` / `linked_list_solution.md`
- `remove_duplicates_challenge.md` / `remove_duplicates_solution.md`
- `kth_to_last_elem_challenge.md` / `kth_to_last_elem_solution.md`
- `delete_mid_challenge.md` / `delete_mid_solution.md`
- `find_loop_start_challenge.md` / `find_loop_start_solution.md`

**Extended Practice**
- `partition_challenge.md` / `partition_solution.md`

**Priming Prompt:**
```
I am a final year BTech CSE student preparing for Google and top SWE interviews.

Focus this audio on linked list problems. Cover:
1. From linked-list.md — the three pointer techniques every linked list 
   problem uses (runner/slow-fast, reversal, dummy node)
2. For each of the five problems — the approach, complexity, and which 
   pointer technique it uses

Special emphasis on find_loop_start — explain Floyd's cycle detection 
algorithm step by step. This is a favourite at Google.

End with: what is the mental checklist before writing any linked list solution?
```

---

### Segment 5 — Stacks & Queues
**Difficulty:** Intermediate

**Select these sources:**
- `stack.md`
- `queue.md`
- `stack_challenge.md` / `stack_solution.md`
- `stack_min_challenge.md` / `stack_min_solution.md`
- `sort_stack_challenge.md` / `sort_stack_solution.md`
- `queue_from_stacks_challenge.md` / `queue_from_stacks_solution.md`
- `set_of_stacks_challenge.md` / `set_of_stacks_solution.md`

**Extended Practice**
- `n_stacks_challenge.md` / `n_stacks_solution.md`
- `queue_list_challenge.md` / `queue_list_solution.md`

**Priming Prompt:**
```
I am a final year BTech CSE student preparing for Google and top SWE interviews.

Focus this audio on stacks and queues. Cover:
1. From stack.md and queue.md — when to use a stack vs queue vs deque 
   and the O(1) operations each supports
2. For each problem — the design insight that makes the solution elegant, 
   not just the steps

Special focus on stack_min (the auxiliary stack trick) and 
queue_from_stacks (the amortized O(1) insight). These design patterns 
appear in real interview questions.

End with: what class of problems should immediately make me think of a stack?
```

---

### Segment 6 — Trees
**Difficulty:** Intermediate

**Select these sources:**
- `tree.md`
- `binary_tree_challenge.md` / `binary_tree_solution.md`
- `height_challenge.md` / `height_solution.md`
- `check_balance_challenge.md` / `check_balance_solution.md`
- `invert_tree_challenge.md` / `invert_tree_solution.md`
- `tree_level_lists_challenge.md` / `tree_level_lists_solution.md`

**Extended Practice**
- `tree_lca_challenge.md` / `tree_lca_solution.md`

**Priming Prompt:**
```
I am a final year BTech CSE student preparing for Google and top SWE interviews.

Focus this audio on binary tree problems. Cover:
1. From tree.md — the four traversal orders (pre/in/post/level), 
   when each is useful, and when to use recursion vs iteration
2. For each problem — which traversal pattern it uses and why, 
   plus time and space complexity

Special emphasis on check_balance — explain why the naive O(n log n) 
solution is suboptimal and how to achieve O(n).

End with: what are the five tree problems every candidate must be able 
to solve without hints at Google?
```

---

### Segment 7 — Binary Search Trees
**Difficulty:** Intermediate

**Select these sources:**
- `bst_challenge.md` / `bst_solution.md`
- `bst_validate_challenge.md` / `bst_validate_solution.md`
- `bst_successor_challenge.md` / `bst_successor_solution.md`
- `bst_second_largest_challenge.md` / `bst_second_largest_solution.md`
- `tree_lca_challenge.md` / `tree_lca_solution.md`

**Extended Practice**
- `bst_min_challenge.md` / `bst_min_solution.md`

**Priming Prompt:**
```
I am a final year BTech CSE student preparing for Google and top SWE interviews.

Focus this audio on BST problems. Cover:
1. First, establish the BST invariant — what property does every BST 
   guarantee, and how does that change the algorithm compared to 
   a regular binary tree?
2. For each problem — how the BST property is exploited to get a better 
   time complexity than a naive tree traversal would give
3. For bst_validate — explain both the common wrong approach and the 
   correct min/max bounds approach

End with: what is the difference in approach between a problem that 
gives you a BST vs a general binary tree?
```

---

### Segment 8 — Graphs
**Difficulty:** Intermediate

**Select these sources:**
- `graph.md`
- `graph_challenge.md` / `graph_solution.md`
- `bfs_challenge.md` / `bfs_solution.md`
- `dfs_challenge.md` / `dfs_solution.md`
- `path_exists_challenge.md` / `path_exists_solution.md`
- `build_order_challenge.md` / `build_order_solution.md`

**Extended Practice**
- `graph_shortest_path_challenge.md` / `graph_shortest_path_solution.md`
- `shortest_path_challenge.md` / `shortest_path_solution.md`
- `grid_path_challenge.md` / `grid_path_solution.md`

**Priming Prompt:**
```
I am a final year BTech CSE student preparing for Google and top SWE interviews.

Focus this audio on graph problems. Cover:
1. From graph.md — adjacency list vs adjacency matrix tradeoffs, 
   directed vs undirected, and the visited set pattern
2. BFS and DFS — the exact template for each with their respective 
   use cases (shortest path vs full exploration)
3. build_order — explain how this maps to topological sort and why 
   cycle detection matters here

This is a high-frequency topic at Google. Take time on each problem. 
End with: how do I recognise that a problem is secretly a graph problem?
```

---

### Segment 9 — Hash Tables, Heaps & Matrix
**Difficulty:** Intermediate

**Select these sources:**
- `hash-table.md`
- `heap.md`
- `matrix.md`
- `hash_map_challenge.md` / `hash_map_solution.md`
- `busiest_period_challenge.md` / `busiest_period_solution.md`
- `min_heap_challenge.md` / `min_heap_solution.md`
- `search_sorted_matrix_challenge.md` / `search_sorted_matrix_solution.md`

**Extended Practice**
- `priority_queue_challenge.md` / `priority_queue_solution.md`

**Priming Prompt:**
```
I am a final year BTech CSE student preparing for Google and top SWE interviews.

Focus this audio on three data structures in one session. Cover:
1. Hash Tables — O(1) average operations, collision handling, and 
   when a hash map reduces an O(n²) solution to O(n)
2. Heaps — the heap property, O(log n) push/pop, and the 
   "top K elements" pattern
3. Matrix — the coordinate trick for treating a 2D matrix as a 
   sorted structure

For each problem, explain why this specific data structure is the 
right choice over alternatives.
```

---

### Segment 10 — Sorting & Searching
**Difficulty:** Intermediate

**Select these sources:**
- `sorting-searching.md`
- `merge_sort_challenge.md` / `merge_sort_solution.md`
- `quick_sort_challenge.md` / `quick_sort_solution.md`
- `insertion_sort_challenge.md` / `insertion_sort_solution.md`
- `rotated_array_search_challenge.md` / `rotated_array_search_solution.md`

**Extended Practice**
- `selection_sort_challenge.md` / `selection_sort_solution.md`
- `radix_sort_challenge.md` / `radix_sort_solution.md`
- `merge_ranges_challenge.md` / `merge_ranges_solution.md`

**Priming Prompt:**
```
I am a final year BTech CSE student preparing for Google and top SWE interviews.

Focus this audio on sorting and searching. Cover:
1. From sorting-searching.md — the comparison of all major sorts by 
   time complexity, space complexity, and stability
2. Merge sort — the divide and conquer logic and why it is O(n log n) 
   guaranteed
3. Quick sort — the pivot selection, partitioning, and why worst case 
   is O(n²) but average is O(n log n)
4. rotated_array_search — the modified binary search pattern for 
   rotated arrays, a very common Google variant

End with: which sorting algorithm would I implement from scratch in an 
interview and why?
```

---

### Segment 11 — Recursion & Backtracking
**Difficulty:** Intermediate–Hard

**Select these sources:**
- `recursion.md`
- `hanoi_challenge.md` / `hanoi_solution.md`
- `permutations_challenge.md` / `permutations_solution.md`
- `power_set_challenge.md` / `power_set_solution.md`
- `n_pairs_parentheses_challenge.md` / `n_pairs_parentheses_solution.md`

**Extended Practice**
- `magic_index_challenge.md` / `magic_index_solution.md`
- `fibonacci_challenge.md` / `fibonacci_solution.md`

**Priming Prompt:**
```
I am a final year BTech CSE student preparing for Google and top SWE interviews.

Focus this audio on recursion and backtracking. Cover:
1. From recursion.md — the three-part recursive structure (base case, 
   recursive case, trust the recursion), and how to think about 
   the call stack
2. hanoi — why the solution has exactly 2^n - 1 moves and how to 
   derive the recursion without memorising it
3. permutations and power_set — the decision tree mental model 
   and how backtracking prunes it
4. n_pairs_parentheses — the constraint-based backtracking pattern 
   (open count, close count rules)

End with: what is the backtracking template I can apply to any 
generate-all-valid-combinations problem?
```

---

### Segment 12 — Dynamic Programming
**Difficulty:** Hard ⭐ Most Critical for Interviews

**Select these sources:**
- `dynamic-programming.md`
- `fibonacci_challenge.md` / `fibonacci_solution.md`
- `coin_change_challenge.md` / `coin_change_solution.md`
- `longest_common_subseq_challenge.md` / `longest_common_subseq_solution.md`
- `knapsack_challenge.md` / `knapsack_solution.md`
- `steps_challenge.md` / `steps_solution.md`

**Extended Practice** *(for a second DP session)*
- `coin_change_min_challenge.md` / `coin_change_min_solution.md`
- `coin_change_ways_challenge.md` / `coin_change_ways_solution.md`
- `longest_inc_subseq_challenge.md` / `longest_inc_subseq_solution.md`
- `longest_common_substr_challenge.md` / `longest_common_substr_solution.md`
- `find_min_cost_challenge.md` / `find_min_cost_solution.md`
- `knapsack_unbounded_challenge.md` / `knapsack_unbounded_solution.md`
- `max_profit_challenge.md` / `max_profit_solution.md`

**Priming Prompt:**
```
I am a final year BTech CSE student preparing for Google and top SWE interviews.
Dynamic programming is the highest-priority topic for my interviews.

Focus this audio on building the DP problem-solving process through 
five problems. For each problem:
1. Show the recursive solution first, identify the overlapping subproblems
2. Show how memoization fixes it (top-down)
3. Show how to convert to bottom-up tabulation
4. State the final time and space complexity

Special emphasis on coin_change — this is one of the most asked DP 
problems at Google. Explain the transition function in detail.

End with: what are the three questions I must ask myself at the start 
of every DP problem?
```

---

### Segment 13 — Bit Manipulation
**Difficulty:** Hard

**Select these sources:**
- `binary.md`
- `bit_challenge.md` / `bit_solution.md`
- `bits_to_flip_challenge.md` / `bits_to_flip_solution.md`
- `flip_bit_challenge.md` / `flip_bit_solution.md`
- `insert_m_into_n_challenge.md` / `insert_m_into_n_solution.md`
- `print_binary_challenge.md` / `print_binary_solution.md`

**Extended Practice**
- `get_next_challenge.md` / `get_next_solution.md`
- `pairwise_swap_challenge.md` / `pairwise_swap_solution.md`
- `maximizing_xor_challenge.md` / `maximizing_xor_solution.md`
- `draw_line_challenge.md` / `draw_line_solution.md`

**Priming Prompt:**
```
I am a final year BTech CSE student preparing for Google and top SWE interviews.

Focus this audio on bit manipulation. Cover:
1. From binary.md — two's complement, the six core bit operations 
   (AND, OR, XOR, NOT, left shift, right shift) with their common 
   interview applications
2. For each problem — which bit trick it exploits and why bit 
   manipulation is better than arithmetic here
3. flip_bit and bits_to_flip — these are sliding window problems 
   disguised as bit problems. Explain this connection explicitly.

End with: what are the five bit tricks I must know by heart before 
any Google interview?
```

---

### Segment 14 — Tries & Advanced
**Difficulty:** Hard

**Select these sources:**
- `trie.md`
- `trie_challenge.md` / `trie_solution.md`
- `interval.md`
- `merge_ranges_challenge.md` / `merge_ranges_solution.md`
- `graph_shortest_path_challenge.md` / `graph_shortest_path_solution.md`
- `island_perimeter_challenge.md` / `island_perimeter_solution.md`

**Priming Prompt:**
```
I am a final year BTech CSE student preparing for Google and top SWE interviews.
This is my final practice session covering advanced data structures.

Focus this audio on three advanced topics. Cover:
1. Tries — the structure (TrieNode with children map + isEnd flag), 
   O(m) insert and search, and what problems require a Trie vs a HashMap
2. Intervals from interval.md — the sort-then-sweep pattern, 
   and merge_ranges as the canonical interval problem
3. graph_shortest_path and island_perimeter — these combine graph 
   traversal with geometric reasoning

End with: in what types of interview questions would I reach for 
a Trie over any other data structure?
```

---

## Remaining Files — What to Do With Them

These files exist in the notebook but are not in the core segments above.
They are valid practice problems — add them to any segment's Extended 
Practice when you want a longer session on that topic.

| File Group | Add to Segment |
|---|---|
| `fizz_buzz`, `check_prime`, `math_ops`, `add_digits`, `add_reverse` | 2 (Arrays/Math) |
| `better_compress`, `format_license_key`, `sentence_screen_fit`, `permutation`, `ransom_note` | 3 (Strings) |
| `nim`, `assign_cookies` | 11 (Recursion — greedy/game) |
| `longest_path`, `longest_substr`, `max_profit`, `steps` | 12 (DP) |
| `sub_two`, `power_two` | 13 (Bit Manipulation) |
| `grid_path`, `shortest_path` | 14 (Tries & Advanced) |
| `utopian_tree`, `foo` | Skip — competitive programming problems, low interview relevance |
| `__template__`, `oop.md`, `geometry.md` | Skip — not relevant for SWE DSA interviews |
```
