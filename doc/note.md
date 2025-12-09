npm run android:sync
chrome://inspect/#devices


同步逻辑，剪贴板

详细的错误捕获路径：之前的代码在第一步失败后，可能在降级到 Web API 的过程中又因为没有权限而静默失败。新的逻辑把每一步都拆得更开，确保了即使 Native 失败了，降级逻辑也能被正确执行（虽然这次大概率是 Native 成功了）。

