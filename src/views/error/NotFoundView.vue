<template>
  <el-empty description="页面不存在，或当前账号没有该菜单权限">
    <el-button type="primary" @click="$router.push('/dashboard')">返回工作台</el-button>
  </el-empty>
</template>
