# 操作地图

由正式清单生成，执行前发现当前安装版Schema。

| 动作 | 用途 | 必填参数 | 效果 |
| --- | --- | --- | --- |
| list_projects | 查找专业工程 |  | read |
| get_project | 读取固定专业工程 | object_id | read |
| save_project | 保存完整专业工程 | expected_revision, expected_sha256, operation_key, content | managed_write |
| put_role | 维护角色 | object_id, expected_revision, expected_sha256, operation_key, role | managed_write |
| remove_role | 移除角色 | object_id, expected_revision, expected_sha256, operation_key, role_id | managed_write |
| put_line | 维护台词 | object_id, expected_revision, expected_sha256, operation_key, line | managed_write |
| remove_line | 移除台词 | object_id, expected_revision, expected_sha256, operation_key, line_id | managed_write |
| put_take | 维护录音候选 | object_id, expected_revision, expected_sha256, operation_key, take | managed_write |
| remove_take | 移除录音候选 | object_id, expected_revision, expected_sha256, operation_key, take_id | managed_write |
| put_clip | 维护时间线片段 | object_id, expected_revision, expected_sha256, operation_key, clip | managed_write |
| remove_clip | 移除时间线片段 | object_id, expected_revision, expected_sha256, operation_key, clip_id | managed_write |
| put_note | 维护听审意见 | object_id, expected_revision, expected_sha256, operation_key, note | managed_write |
| remove_note | 移除听审意见 | object_id, expected_revision, expected_sha256, operation_key, note_id | managed_write |
| check_mix | 检查录音与时间线 | object_id | read |
| render_mix | 渲染固定PCM混音 | object_id | read |
| locate_audio | 定位声音对应台词 | object_id, time_ms | read |
| inspect_take | 核验固定录音 | object_id, take_id | read |
| get_source | 读取固定来源 | object_id, source_index | read |
| get_basis | 读取固定专业依据 | object_id, basis_index | read |
| compare_versions | 比较固定修订 | object_id, from_revision, to_revision | read |
| export_project | 导出固定专业报告 | object_id, format | read |
| build_context | 准备有界创作上下文 | object_id, goal, max_chars | read |
| create_handoff | 准备精确AI交接 | object_id, goal | read |
| get_operation | 回读原操作 | operation_key | read |
