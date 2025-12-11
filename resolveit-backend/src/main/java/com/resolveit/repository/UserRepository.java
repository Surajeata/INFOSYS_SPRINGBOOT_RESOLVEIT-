package com.resolveit.repository;

import com.resolveit.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Boolean existsByUsername(String username);
    Boolean existsByEmail(String email);
    
    @Query("SELECT u FROM User u WHERE u.role = 'ADMIN' OR u.role = 'MODERATOR'")
    List<User> findAllAdminsAndModerators();
    
    List<User> findByRole(User.Role role);
}
